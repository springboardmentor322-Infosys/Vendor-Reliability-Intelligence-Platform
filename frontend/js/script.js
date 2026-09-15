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

// Role-Isolated Multi-User Profile Engine
const defaultRoleProfiles = {
    "Administrator": {
        full_name: "Admin User",
        email: "admin@vendoriq.com",
        mobile: "+91 98765 43210",
        department: "IT & System Administration",
        role: "Administrator"
    },
    "Procurement Manager": {
        full_name: "Sarah Jenkins",
        email: "sarah.procurement@vendoriq.com",
        mobile: "+91 98123 45678",
        department: "Procurement & Strategic Sourcing",
        role: "Procurement Manager"
    },
    "Supply Chain Manager": {
        full_name: "Robert Vance",
        email: "robert.supply@vendoriq.com",
        mobile: "+91 98234 56789",
        department: "Supply Chain & Logistics",
        role: "Supply Chain Manager"
    },
    "Vendor": {
        full_name: "TechSupply Operations",
        email: "contact@techsupply.com",
        mobile: "+91 98345 67890",
        department: "Supplier Sales & Operations",
        role: "Vendor"
    },
    "Finance Officer": {
        full_name: "Michael Chang",
        email: "michael.finance@vendoriq.com",
        mobile: "+91 98456 78901",
        department: "Finance & Accounting",
        role: "Finance Officer"
    },
    "Auditor": {
        full_name: "Elena Rostova",
        email: "elena.audit@vendoriq.com",
        mobile: "+91 98567 89012",
        department: "Internal Audit & Compliance",
        role: "Auditor"
    }
};

function getRoleProfile(roleName) {
    const role = roleName || localStorage.getItem("userRole") || "Administrator";
    const key = `profile_${role}`;
    let stored = localStorage.getItem(key);
    if (stored) {
        try {
            let parsed = JSON.parse(stored);
            if (parsed && parsed.full_name) return parsed;
        } catch(e) {}
    }
    const def = defaultRoleProfiles[role] || defaultRoleProfiles["Administrator"];
    localStorage.setItem(key, JSON.stringify(def));
    return def;
}

function saveRoleProfile(roleName, data) {
    const role = roleName || localStorage.getItem("userRole") || "Administrator";
    const key = `profile_${role}`;
    localStorage.setItem(key, JSON.stringify(data));
    
    // Set active session pointers
    localStorage.setItem("userRole", role);
    localStorage.setItem("userName", data.full_name);
    localStorage.setItem("userEmail", data.email);
    localStorage.setItem("userMobile", data.mobile);
    localStorage.setItem("userDepartment", data.department);
}

function renderProfileUI(name, role, email, mobile, dept) {
    const nameInput = document.getElementById("profileName");
    const emailInput = document.getElementById("profileEmail");
    const mobileInput = document.getElementById("profileMobile");
    const deptInput = document.getElementById("profileDepartment");
    const roleSelect = document.getElementById("profileRole");

    if (nameInput) nameInput.value = name;
    if (emailInput) emailInput.value = email;
    if (mobileInput) mobileInput.value = mobile;
    if (deptInput) deptInput.value = dept;
    if (roleSelect) roleSelect.value = role;

    const dispName = document.getElementById("displayFullName");
    const dispRole = document.getElementById("displayRoleTitle");
    const dispEmail = document.getElementById("displayEmailText");
    const dispMobile = document.getElementById("displayMobileText");
    const dispDept = document.getElementById("displayDeptTag");
    const kpiRole = document.getElementById("kpiUserRole");
    const avatarLarge = document.getElementById("profileAvatarLarge");

    if (dispName) dispName.innerText = name;
    if (dispRole) dispRole.innerText = role;
    if (dispEmail) dispEmail.innerText = email;
    if (dispMobile) dispMobile.innerText = mobile;
    if (dispDept) dispDept.innerText = dept;
    if (kpiRole) kpiRole.innerText = role;
    if (avatarLarge) avatarLarge.innerText = name.charAt(0).toUpperCase();

    if (typeof initRoleSession === 'function') {
        initRoleSession();
    }
}

function loadProfilePage() {
    if (!document.getElementById("profileName")) return;

    let role = localStorage.getItem("userRole") || "Administrator";
    let prof = getRoleProfile(role);

    renderProfileUI(
        prof.full_name,
        role,
        prof.email,
        prof.mobile,
        prof.department
    );
}

function saveUserProfile() {
    const nameInput = document.getElementById("profileName");
    const emailInput = document.getElementById("profileEmail");
    const mobileInput = document.getElementById("profileMobile");
    const deptInput = document.getElementById("profileDepartment");
    const roleSelect = document.getElementById("profileRole");

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const mobile = mobileInput ? mobileInput.value.trim() : "";
    const dept = deptInput ? deptInput.value.trim() : "";
    const selectedRole = roleSelect ? roleSelect.value : (localStorage.getItem("userRole") || "Administrator");

    if (!name || !email) {
        if (typeof showNotificationToast === 'function') showNotificationToast("Please enter full name and email.", "error");
        else alert("Please enter full name and email.");
        return;
    }

    const updatedProfile = {
        full_name: name,
        email: email,
        mobile: mobile,
        department: dept,
        role: selectedRole
    };

    saveRoleProfile(selectedRole, updatedProfile);

    fetch("http://127.0.0.1:8000/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile)
    }).catch(() => {});

    renderProfileUI(name, selectedRole, email, mobile, dept);

    if (typeof addNotification === 'function') {
        addNotification(`User profile updated for ${name} (${selectedRole})`, 'Low', 'System Audit', 'Profile Update');
    }

    if (typeof showNotificationToast === 'function') {
        showNotificationToast(`Profile updated for ${selectedRole} (${name})!`, "success");
    } else {
        alert("Profile Updated Successfully!");
    }
}

// Attach role switch listener on profile page
document.getElementById("profileRole")?.addEventListener("change", function() {
    const newRole = this.value;
    localStorage.setItem("userRole", newRole);
    const prof = getRoleProfile(newRole);
    renderProfileUI(prof.full_name, newRole, prof.email, prof.mobile, prof.department);
});

document.getElementById("updateProfileBtn")?.addEventListener("click", saveUserProfile);
document.getElementById("headerSaveProfileBtn")?.addEventListener("click", saveUserProfile);

document.getElementById("updatePasswordBtn")?.addEventListener("click", function() {
    const newPwd = document.getElementById("newPassword")?.value;
    const confirmPwd = document.getElementById("confirmPassword")?.value;

    if (!newPwd || newPwd.length < 4) {
        if (typeof showNotificationToast === 'function') showNotificationToast("Password must be at least 4 characters long.", "error");
        else alert("Password must be at least 4 characters long.");
        return;
    }

    if (newPwd !== confirmPwd) {
        if (typeof showNotificationToast === 'function') showNotificationToast("New passwords do not match.", "error");
        else alert("New passwords do not match.");
        return;
    }

    fetch("http://127.0.0.1:8000/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPwd })
    }).catch(() => {});

    if (document.getElementById("currentPassword")) document.getElementById("currentPassword").value = "";
    if (document.getElementById("newPassword")) document.getElementById("newPassword").value = "";
    if (document.getElementById("confirmPassword")) document.getElementById("confirmPassword").value = "";

    if (typeof showNotificationToast === 'function') {
        showNotificationToast("Password updated successfully!", "success");
    } else {
        alert("Password updated successfully!");
    }
});

if (document.readyState === "complete" || document.readyState === "interactive") {
    loadProfilePage();
} else {
    document.addEventListener("DOMContentLoaded", loadProfilePage);
}
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
                labels: getPastMonthLabels(5),
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
    window.open("http://127.0.0.1:8000/reports/export/vendors.csv", "_blank");
});

document.getElementById("downloadExcelBtn")?.addEventListener("click", function() {
    window.open("http://127.0.0.1:8000/reports/export/purchase-orders.csv", "_blank");
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
    const report = (typeof reportsData !== 'undefined' && Array.isArray(reportsData)) ? reportsData.find(r => r.id === id) : null;
    const cat = report ? report.category : "";
    if (cat.includes("Vendor")) {
        window.open("http://127.0.0.1:8000/reports/export/vendors.csv", "_blank");
    } else if (cat.includes("Order")) {
        window.open("http://127.0.0.1:8000/reports/export/purchase-orders.csv", "_blank");
    } else if (cat.includes("Contract")) {
        window.open("http://127.0.0.1:8000/reports/export/contracts.csv", "_blank");
    } else {
        window.open("http://127.0.0.1:8000/reports/export/procurements.csv", "_blank");
    }
}

function downloadReportExcel(id) {
    downloadReportPdf(id);
}

function deleteReport(id) {
    if (confirm(`Are you sure you want to delete report ${id}?`)) {
        reportsData = reportsData.filter(r => r.id !== id);
        loadReports();
    }
}

// Initializer
loadReports();

// Dynamic Date Helper Utilities
function getPastMonthLabels(count = 5) {
    const labels = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.toLocaleDateString('en-US', { month: 'short' });
        const y = d.getFullYear();
        labels.push(`${m} ${y}`);
    }
    return labels;
}

function updateDynamicDates() {
    const today = new Date();
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateFormatted = today.toLocaleDateString('en-US', options);
    const pillText = `📅 ${dateFormatted}`;

    document.querySelectorAll('.top-date-pill').forEach(el => {
        el.innerText = pillText;
    });

    document.querySelectorAll('.top-icons').forEach(topIcons => {
        if (!topIcons.querySelector('.top-date-pill')) {
            const datePill = document.createElement('div');
            datePill.className = 'top-date-pill';
            datePill.style.cssText = 'background: #f1f5f9; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #475569; border: 1px solid #cbd5e1; display: inline-flex; align-items: center; margin-right: 8px;';
            datePill.innerText = pillText;
            topIcons.insertBefore(datePill, topIcons.firstChild);
        }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const curYear = today.getFullYear();
    const curMonthName = monthNames[today.getMonth()];

    document.querySelectorAll('.member-since-tag').forEach(el => {
        el.innerText = `Member since ${curMonthName} ${curYear}`;
    });
}

// ===============================
// Unified Notifications & Alerts Dashboard Logic
// ===============================

function getDynamicSeedNotifications() {
    const now = new Date();
    const fmt = (d) => d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    const t10 = new Date(now); t10.setHours(10, 30, 0);
    const t11 = new Date(now); t11.setHours(11, 15, 0);
    const yest = new Date(now); yest.setDate(now.getDate() - 1); yest.setHours(9, 0, 0);
    const d3 = new Date(now); d3.setDate(now.getDate() - 3); d3.setHours(14, 45, 0);
    const d5 = new Date(now); d5.setDate(now.getDate() - 5); d5.setHours(16, 20, 0);
    const d7 = new Date(now); d7.setDate(now.getDate() - 7); d7.setHours(8, 10, 0);

    return [
        { id: "N001", date: fmt(t10), category: "Vendor Alert", title: "New Vendor Onboarded", message: "Acme Logistics registered on the portal and is pending compliance document verification.", priority: "Medium", status: "Unread" },
        { id: "N002", date: fmt(t11), category: "Purchase Order", title: "PO #PO1002 Fully Delivered", message: "Supplier Apex Industrial confirmed delivery of all server hardware equipment with 100% QA pass.", priority: "Low", status: "Read" },
        { id: "N003", date: fmt(yest), category: "Contract Warning", title: "Contract Expiration Notice", message: "Global Supplies Master Services Agreement notice window closes in 15 days. Renewal review recommended.", priority: "High", status: "Unread" },
        { id: "N004", date: fmt(d3), category: "System Audit", title: "Reliability Sync Completed", message: "Automated reliability scoring sync executed across all active vendors with zero schema anomalies.", priority: "Low", status: "Read" },
        { id: "N005", date: fmt(d5), category: "Vendor Alert", title: "Performance Score Drop Alert", message: "TechCorp Inc overall reliability score dropped below critical 60% threshold due to consecutive delivery delays.", priority: "High", status: "Unread" },
        { id: "N006", date: fmt(d7), category: "Purchase Order", title: "PO #PO1009 Approval Required", message: "Purchase order exceeding $50,000 threshold requires senior procurement manager signature.", priority: "Medium", status: "Unread" }
    ];
}

const defaultSeedNotifications = getDynamicSeedNotifications();

let activeNotificationFilter = "all";
let currentNotificationView = "feed";
let currentDetailId = null;

function getStoredNotifications() {
    let stored = localStorage.getItem("notifications");
    if (!stored) {
        const seeds = getDynamicSeedNotifications();
        localStorage.setItem("notifications", JSON.stringify(seeds));
        return seeds;
    }
    try {
        let parsed = JSON.parse(stored);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            const seeds = getDynamicSeedNotifications();
            localStorage.setItem("notifications", JSON.stringify(seeds));
            return seeds;
        }
        return parsed;
    } catch (e) {
        const seeds = getDynamicSeedNotifications();
        localStorage.setItem("notifications", JSON.stringify(seeds));
        return seeds;
    }
}

function updateTopbarUnreadBadge() {
    const notifications = getStoredNotifications();
    const unreadCount = notifications.filter(n => n.status === "Unread" || n.is_read === false).length;
    
    ['topbarUnreadBadge', 'notifTopBadge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = unreadCount;
    });

    document.querySelectorAll('.icon-btn .badge-count').forEach(badge => {
        if (badge.parentElement && badge.parentElement.innerText.includes('🔔')) {
            badge.innerText = unreadCount;
        }
    });
}

function toggleNotificationQuickDropdown(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    let dropdown = document.getElementById("notificationQuickDropdown");
    
    if (dropdown && dropdown.style.display === "block") {
        dropdown.style.display = "none";
        return;
    }

    if (!dropdown) {
        dropdown = document.createElement("div");
        dropdown.id = "notificationQuickDropdown";
        document.body.appendChild(dropdown);
    }

    const target = (e && e.currentTarget) ? e.currentTarget : document.querySelector('.icon-btn');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const right = window.innerWidth - rect.right - window.scrollX;

    dropdown.style.cssText = `
        position: absolute;
        top: ${top}px;
        right: ${Math.max(10, right)}px;
        width: 380px;
        max-width: 92vw;
        max-height: 500px;
        background: #ffffff;
        border-radius: 14px;
        box-shadow: 0 12px 36px rgba(15, 23, 42, 0.18);
        border: 1px solid #e2e8f0;
        z-index: 99999;
        display: block;
        padding: 0;
        overflow: hidden;
        font-family: 'Plus Jakarta Sans', sans-serif;
    `;

    renderQuickDropdownContent(dropdown);
}

function renderQuickDropdownContent(dropdown) {
    const notifications = getStoredNotifications();
    const unread = notifications.filter(n => n.status === "Unread" || n.is_read === false);

    let listHtml = "";
    if (notifications.length === 0) {
        listHtml = `
            <div style="padding: 30px; text-align: center; color: #64748b;">
                <div style="font-size: 28px; margin-bottom: 6px;">🔔</div>
                <div style="font-size: 13px; font-weight: 600;">No notifications available</div>
            </div>
        `;
    } else {
        const displayList = notifications.slice(0, 5);
        listHtml = displayList.map(n => {
            const isUnread = n.status === "Unread" || n.is_read === false;
            let priorityBadge = n.priority === "High" 
                ? '<span style="background:#fef2f2; color:#ef4444; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700;">🚨 High</span>' 
                : (n.priority === "Medium" ? '<span style="background:#fffbe6; color:#d97706; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700;">⚠️ Medium</span>' : '<span style="background:#f0fdf4; color:#16a34a; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700;">ℹ️ Info</span>');

            return `
                <div style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; background: ${isUnread ? '#f8fafc' : '#ffffff'}; transition: background 0.15s; display: flex; gap: 12px; align-items: flex-start;">
                    <div style="font-size: 18px; line-height: 1; margin-top: 2px;">🔔</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                            <span style="font-size: 11px; font-weight: 700; color: #64748b;">${n.category || 'Alert'}</span>
                            ${priorityBadge}
                        </div>
                        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${n.title}</div>
                        <div style="font-size: 12px; color: #475569; margin-bottom: 6px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${n.message}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 11px; color: #94a3b8;">🕒 ${n.date}</span>
                            ${isUnread ? `<button type="button" style="background:#10b981; color:#fff; border:none; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;" onclick="markQuickNotifRead('${n.id}', event)">✓ Mark Read</button>` : '<span style="font-size:11px; color:#10b981; font-weight:600;">✓ Read</span>'}
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    dropdown.innerHTML = `
        <div style="padding: 14px 16px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">🔔</span>
                <span style="font-weight: 700; font-size: 14px;">Live Notifications</span>
                <span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 800;">${unread.length} Unread</span>
            </div>
            <span style="cursor: pointer; opacity: 0.8; font-weight: bold; font-size: 16px;" onclick="document.getElementById('notificationQuickDropdown').style.display='none'">✕</span>
        </div>
        <div style="max-height: 360px; overflow-y: auto;">
            ${listHtml}
        </div>
        <div style="padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <button type="button" style="background: none; border: none; color: #3b82f6; font-size: 12px; font-weight: 700; cursor: pointer; padding: 0;" onclick="markAllQuickNotifRead(event)">✓ Mark All Read</button>
            <a href="notifications.html" style="color: #2563eb; font-size: 12px; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 4px;">View All Alerts →</a>
        </div>
    `;
}

function markQuickNotifRead(notifId, e) {
    if (e) e.stopPropagation();
    let notifications = getStoredNotifications();
    const item = notifications.find(n => n.id === notifId);
    if (item) {
        item.status = "Read";
        item.is_read = true;
        localStorage.setItem("notifications", JSON.stringify(notifications));
        
        if (item.rawId) {
            fetch(`http://127.0.0.1:8000/notifications/${item.rawId}/read`, { method: "PUT" }).catch(() => {});
        }

        updateTopbarUnreadBadge();
        const dropdown = document.getElementById("notificationQuickDropdown");
        if (dropdown) renderQuickDropdownContent(dropdown);

        if (typeof loadNotifications === "function" && (document.getElementById("notificationStreamFeed") || document.getElementById("notificationTableBody"))) {
            loadNotifications();
        }
    }
}

function markAllQuickNotifRead(e) {
    if (e) e.stopPropagation();
    let notifications = getStoredNotifications();
    notifications.forEach(n => {
        n.status = "Read";
        n.is_read = true;
    });
    localStorage.setItem("notifications", JSON.stringify(notifications));

    fetch("http://127.0.0.1:8000/notifications/mark-all-read", { method: "POST" }).catch(() => {});

    updateTopbarUnreadBadge();
    const dropdown = document.getElementById("notificationQuickDropdown");
    if (dropdown) renderQuickDropdownContent(dropdown);

    if (typeof loadNotifications === "function" && (document.getElementById("notificationStreamFeed") || document.getElementById("notificationTableBody"))) {
        loadNotifications();
    }
}

function initNotificationDropdown() {
    document.querySelectorAll('.icon-btn').forEach(btn => {
        if (btn.innerText.includes('🔔')) {
            btn.style.cursor = 'pointer';
            btn.onclick = (e) => toggleNotificationQuickDropdown(e);
        }
    });

    document.addEventListener("click", function(e) {
        const dropdown = document.getElementById("notificationQuickDropdown");
        if (dropdown && dropdown.style.display === "block") {
            const isClickInsideBell = Array.from(document.querySelectorAll('.icon-btn')).some(btn => btn.contains(e.target));
            if (!dropdown.contains(e.target) && !isClickInsideBell) {
                dropdown.style.display = "none";
            }
        }
    });
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

function renderNotifications(notifications) {
    const feedContainer = document.getElementById("notificationStreamFeed");
    const tableBody = document.getElementById("notificationTableBody");

    updateTopbarUnreadBadge();

    if (!feedContainer && !tableBody) return;

    let unreadCount = 0;
    let highCount = 0;
    let systemCount = 0;

    notifications.forEach(item => {
        const itemStatus = item.status || "Unread";
        const itemPriority = item.priority || "Medium";
        const itemCategory = item.category || "System Audit";

        if (itemStatus === "Unread") unreadCount++;
        if (itemPriority === "High") highCount++;
        if (itemCategory === "System Audit" || itemCategory === "Purchase Order") systemCount++;
    });

    let searchInput = document.getElementById("searchNotifications");
    let searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filteredItems = notifications.filter(item => {
        const itemStatus = item.status || "Unread";
        const itemPriority = item.priority || "Medium";
        const itemCategory = item.category || "System Audit";

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
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${item.message}</div>
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

function loadNotifications() {
    const feedContainer = document.getElementById("notificationStreamFeed");
    const tableBody = document.getElementById("notificationTableBody");
    if (!feedContainer && !tableBody && !document.getElementById("topbarUnreadBadge")) return;

    fetch("http://127.0.0.1:8000/notifications")
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                let mapped = data.map(n => ({
                    id: "N" + String(n.id).padStart(3, '0'),
                    rawId: n.id,
                    date: n.created_at ? new Date(n.created_at).toLocaleString() : new Date().toLocaleString(),
                    category: n.category || "System Audit",
                    title: n.title,
                    message: n.message,
                    priority: n.type === "danger" ? "High" : (n.type === "warning" ? "Medium" : "Low"),
                    status: n.is_read ? "Read" : "Unread"
                }));
                localStorage.setItem("notifications", JSON.stringify(mapped));
                renderNotifications(mapped);
            } else {
                renderNotifications(getStoredNotifications());
            }
        })
        .catch(err => {
            renderNotifications(getStoredNotifications());
        });
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
    fetch("http://127.0.0.1:8000/notifications/clear-read", { method: "DELETE" }).catch(() => {});
    loadNotifications();
    showNotificationToast(`Cleared ${readCount} read notification(s).`, "success");
});

function markAllNotificationsRead() {
    let notifications = getStoredNotifications();
    notifications.forEach(item => item.status = "Read");
    localStorage.setItem("notifications", JSON.stringify(notifications));
    fetch("http://127.0.0.1:8000/notifications/mark-all-read", { method: "POST" }).catch(() => {});
    loadNotifications();
    showNotificationToast("All notifications marked as read.", "success");
}

function markNotificationRead(idOrIndex) {
    let notifications = getStoredNotifications();
    let notif = notifications.find(n => String(n.id) === String(idOrIndex) || String(n.rawId) === String(idOrIndex));
    if (!notif && typeof idOrIndex === 'number' && notifications[idOrIndex]) {
        notif = notifications[idOrIndex];
    }
    if (notif) {
        notif.status = "Read";
        localStorage.setItem("notifications", JSON.stringify(notifications));
        if (notif.rawId) {
            fetch(`http://127.0.0.1:8000/notifications/${notif.rawId}/read`, { method: "PUT" }).catch(() => {});
        } else {
            const num = parseInt(String(idOrIndex).replace(/\D/g, ''));
            if (!isNaN(num)) {
                fetch(`http://127.0.0.1:8000/notifications/${num}/read`, { method: "PUT" }).catch(() => {});
            }
        }
        loadNotifications();
        showNotificationToast(`Alert ${notif.id || ''} marked as read.`, "success");
    }
}

function markNotificationAsRead(idOrIndex) {
    markNotificationRead(idOrIndex);
}

function deleteNotification(idOrIndex) {
    let notifications = getStoredNotifications();
    let index = notifications.findIndex(n => String(n.id) === String(idOrIndex) || String(n.rawId) === String(idOrIndex));
    if (index === -1 && typeof idOrIndex === 'number') index = idOrIndex;
    
    if (index !== -1) {
        const item = notifications[index];
        if (confirm(`Are you sure you want to delete notification alert ${item.id || ''}?`)) {
            if (item.rawId) {
                fetch(`http://127.0.0.1:8000/notifications/${item.rawId}`, { method: "DELETE" }).catch(() => {});
            } else {
                const num = parseInt(String(idOrIndex).replace(/\D/g, ''));
                if (!isNaN(num)) {
                    fetch(`http://127.0.0.1:8000/notifications/${num}`, { method: "DELETE" }).catch(() => {});
                }
            }
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

// ==========================================================================
// ROLE-BASED ACCESS CONTROL & SEPARATE DASHBOARD ENGINE (ALL 6 ROLES)
// ==========================================================================

const rolePermissions = {
    "Administrator": ["dashboard.html", "vendors.html", "procurement.html", "purchase-orders.html", "contracts.html", "communication.html", "performance.html", "analytics.html", "reports.html", "notifications.html"],
    "Procurement Manager": ["dashboard.html", "procurement.html", "purchase-orders.html", "vendors.html", "contracts.html", "reports.html"],
    "Supply Chain Manager": ["dashboard.html", "vendors.html", "performance.html", "analytics.html", "notifications.html"],
    "Vendor": ["dashboard.html", "purchase-orders.html", "contracts.html", "communication.html"],
    "Finance Officer": ["dashboard.html", "purchase-orders.html", "procurement.html", "reports.html"],
    "Auditor": ["dashboard.html", "contracts.html", "reports.html", "notifications.html"]
};

let activeRoleChartInstances = {};

function destroyRoleCharts() {
    Object.keys(activeRoleChartInstances).forEach(key => {
        if (activeRoleChartInstances[key]) {
            activeRoleChartInstances[key].destroy();
        }
    });
    activeRoleChartInstances = {};
}

function initRoleSession() {
    const currentRole = localStorage.getItem("userRole") || "Administrator";
    const currentUserName = localStorage.getItem("userName") || currentRole + " User";

    // 1. Topbar Profile Display
    const profileChips = document.querySelectorAll(".profile-chip");
    profileChips.forEach(chip => {
        chip.innerHTML = `
            <span class="avatar">👤</span>
            <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.2;">
                <span class="user-name" style="font-weight: 700; font-size: 13px;">${currentUserName}</span>
                <span class="role-badge-text" style="font-size: 10px; color: #3b82f6; font-weight: 800; text-transform: uppercase;">${currentRole}</span>
            </div>
            <a href="login.html" title="Switch Role / Sign Out" style="margin-left: 8px; color: #94a3b8; font-size: 12px; text-decoration: none;" onclick="localStorage.clear();">🚪</a>
        `;
    });

    // 2. Sidebar Footer User Display
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const sidebarUserName = document.getElementById("sidebarUserName");
    const sidebarUserRole = document.getElementById("sidebarUserRole");
    if (sidebarAvatar) sidebarAvatar.innerText = currentUserName.charAt(0).toUpperCase();
    if (sidebarUserName) sidebarUserName.innerText = currentUserName;
    if (sidebarUserRole) sidebarUserRole.innerText = currentRole;

    // 3. Update Dashboard Header Title and Description
    const dashHeaderTitle = document.getElementById("dashRoleTitle");
    const dashHeaderSub = document.getElementById("dashRoleSubtitle");
    
    if (dashHeaderTitle) dashHeaderTitle.innerText = `Welcome back, ${currentUserName.split(' ')[0]}! 👋`;

    if (dashHeaderSub) {
        const roleDescriptions = {
            "Administrator": "Here is the overall platform overview and system statistics.",
            "Procurement Manager": "Here is your procurement overview, active purchase orders, and cost metrics.",
            "Supply Chain Manager": "Here is your supply chain overview, delivery performance, and supplier risk metrics.",
            "Vendor": "Here is your vendor reliability score, order history, and active performance status.",
            "Finance Officer": "Here is your financial summary, spend analysis, and payment performance overview.",
            "Auditor": "Here is your audit overview, compliance ratings, and historical activity logs."
        };
        dashHeaderSub.textContent = roleDescriptions[currentRole] || "Real-time vendor reliability intelligence and risk management platform.";
    }

    // 4. Highlight active role tab in Top Switcher
    document.querySelectorAll(".role-tab-btn").forEach(btn => {
        if (btn.getAttribute("data-role") === currentRole) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // 5. Render charts & KPIs for current role
    renderRoleDashboardCharts(currentRole);

    // 6. Dynamic System Dates & Live Notification Bell Dropdown
    updateDynamicDates();
    updateTopbarUnreadBadge();
    initNotificationDropdown();
}

function renderRoleDashboardCharts(roleName) {
    destroyRoleCharts();

    fetch("http://127.0.0.1:8000/dashboard/stats")
        .then(res => res.json())
        .then(stats => {
            // Helper text setter for KPI cards
            const setTxt = (id, val) => {
                const el = document.getElementById(id);
                if (el && val !== undefined && val !== null) el.innerHTML = val;
            };

            // 1. Vendor View Cards
            const scoreVal = stats.average_vendor_score || 89;
            setTxt("vScoreVal", `${scoreVal} <small style="font-size: 12px; color: #64748b;">/100</small>`);
            setTxt("vGaugeScoreVal", `${scoreVal} <small style="font-size: 14px;">/100</small>`);
            setTxt("vPOCountVal", (stats.total_orders || 0).toLocaleString());
            setTxt("vOnTimeVal", `${stats.on_time_delivery_pct || 92.6}%`);
            setTxt("vQualityVal", `${stats.avg_quality || 4.6} <small style="font-size: 12px; color: #64748b;">/5.0</small>`);
            setTxt("vInvoicedVal", stats.formatted_completed_spend || stats.formatted_spend || "₹0");
            setTxt("vPendingPayVal", stats.formatted_pending_spend || "₹0");

            // 2. Administrator View Cards
            setTxt("adminUserCount", (stats.total_users || 0).toLocaleString());
            setTxt("adminVendorCount", (stats.total_vendors || 0).toLocaleString());
            setTxt("adminPOCount", (stats.total_orders || 0).toLocaleString());
            setTxt("adminSpendCount", stats.formatted_spend || "₹0");
            setTxt("adminContractCount", (stats.active_contracts || 0).toLocaleString());

            // 3. Auditor View Cards
            setTxt("auditConductedVal", (stats.audits_conducted || 0).toLocaleString());
            setTxt("auditComplianceVal", `${stats.avg_compliance_score || 86.5}%`);
            setTxt("auditFindingsVal", (stats.open_findings || 0).toLocaleString());
            setTxt("auditRiskVal", (stats.risk_vendors || 0).toLocaleString());
            setTxt("auditPendingVal", ((stats.pending_orders || 0) + (stats.total_procurements || 0)).toLocaleString());
            setTxt("auditOverdueVal", (stats.expiring_contracts || 0).toLocaleString());

            // 4. Finance Officer View Cards
            setTxt("finSpendVal", stats.formatted_spend || "₹0");
            setTxt("finSavingsVal", stats.formatted_savings || "₹0");
            setTxt("finPaymentsVal", stats.formatted_completed_spend || "₹0");
            setTxt("finBudgetUtilVal", `${Math.min(100, Math.round(((stats.completed_spend || 0) / (stats.total_spend || 1)) * 1000) / 10)}%`);
            setTxt("finPendingPayVal", stats.formatted_pending_spend || "₹0");
            setTxt("finCashFlowVal", stats.formatted_completed_spend || "₹0");

            // 5. Procurement Manager View Cards
            setTxt("pmPOCountVal", (stats.total_orders || 0).toLocaleString());
            setTxt("pmPendingApprovalVal", (stats.pending_orders || 0).toLocaleString());
            setTxt("pmProcurementSpendVal", stats.formatted_spend || "₹0");
            setTxt("pmVendorPoolVal", (stats.total_vendors || 0).toLocaleString());
            setTxt("pmDeliveryOnTimeVal", `${stats.on_time_delivery_pct || 94.2}%`);
            setTxt("pmRequisitionsVal", (stats.total_procurements || 0).toLocaleString());

            // 6. Supply Chain Manager View Cards
            setTxt("scmRiskVendorsVal", (stats.risk_vendors || 0).toLocaleString());
            setTxt("scmDelayedVal", (stats.delayed_shipments || 0).toLocaleString());
            setTxt("scmOnTimeVal", `${stats.on_time_delivery_pct || 91.8}%`);
            setTxt("scmRespTimeVal", `${stats.avg_response_time || 1.4} hrs`);
            setTxt("scmOrderCompVal", `${stats.avg_order_completion || 97.5}%`);
            setTxt("scmAvgScoreVal", (stats.average_vendor_score || 86.2).toString());

            if (roleName === "Vendor") {
                // Half-Donut Gauge Chart for Vendor Reliability Score (89/100)
                const ctxGauge = document.getElementById("vendorGaugeChart");
                if (ctxGauge) {
                    const score = stats.average_vendor_score || 89;
                    activeRoleChartInstances.vendorGauge = new Chart(ctxGauge, {
                        type: "doughnut",
                        data: {
                            labels: ["Reliability Score", "Remaining"],
                            datasets: [{
                                data: [score, Math.max(0, 100 - score)],
                                backgroundColor: ["#10b981", "#e2e8f0"],
                                borderWidth: 0
                            }]
                        },
                        options: {
                            rotation: -90,
                            circumference: 180,
                            cutout: "80%",
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false }, tooltip: { enabled: false } }
                        }
                    });
                }
            } else if (roleName === "Administrator") {
                // 1. Platform Overview (Line Chart)
                const ctxOverview = document.getElementById("adminPlatformOverviewChart");
                if (ctxOverview && stats.platform_overview) {
                    const poData = stats.platform_overview;
                    activeRoleChartInstances.adminOverview = new Chart(ctxOverview, {
                        type: "line",
                        data: {
                            labels: poData.labels || ["Jan", "Feb", "Mar", "Apr", "May"],
                            datasets: [
                                { label: "Departments", data: poData.departments, borderColor: "#3b82f6", tension: 0.3, fill: false },
                                { label: "Requisitions", data: poData.requisitions, borderColor: "#10b981", tension: 0.3, fill: false },
                                { label: "Workflows (POs)", data: poData.workflows, borderColor: "#8b5cf6", tension: 0.3, fill: false }
                            ]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }

                // 2. Vendor Status Overview (Doughnut Chart)
                const ctxStatus = document.getElementById("adminVendorStatusChart");
                if (ctxStatus && stats.vendor_status_overview) {
                    const vObj = stats.vendor_status_overview;
                    const vLabels = Object.keys(vObj).map(k => `${k} (${vObj[k]})`);
                    const vValues = Object.values(vObj);

                    activeRoleChartInstances.adminStatus = new Chart(ctxStatus, {
                        type: "doughnut",
                        data: {
                            labels: vLabels,
                            datasets: [{
                                data: vValues,
                                backgroundColor: ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#64748b"]
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, cutout: "65%" }
                    });
                }

                // 3. Procurement Status Overview (Doughnut Chart)
                const ctxPO = document.getElementById("adminProcurementStatusChart");
                if (ctxPO && stats.procurement_status_overview) {
                    const pObj = stats.procurement_status_overview;
                    const pLabels = Object.keys(pObj).map(k => `${k} (${pObj[k]})`);
                    const pValues = Object.values(pObj);

                    activeRoleChartInstances.adminPO = new Chart(ctxPO, {
                        type: "doughnut",
                        data: {
                            labels: pLabels,
                            datasets: [{
                                data: pValues,
                                backgroundColor: ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444"]
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, cutout: "65%" }
                    });
                }
            } else if (roleName === "Auditor") {
                const ctxComp = document.getElementById("auditorComplianceChart");
                if (ctxComp && stats.auditor_compliance_overview) {
                    const compData = stats.auditor_compliance_overview;
                    const compLabels = Object.keys(compData).map(k => `${k} (${compData[k]})`);
                    activeRoleChartInstances.auditComp = new Chart(ctxComp, {
                        type: "doughnut",
                        data: {
                            labels: compLabels,
                            datasets: [{ data: Object.values(compData), backgroundColor: ["#10b981", "#f59e0b", "#ef4444"] }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, cutout: "65%" }
                    });
                }
                const ctxFind = document.getElementById("auditorFindingsChart");
                if (ctxFind && stats.auditor_findings_summary) {
                    const findData = stats.auditor_findings_summary;
                    activeRoleChartInstances.auditFind = new Chart(ctxFind, {
                        type: "bar",
                        data: {
                            labels: Object.keys(findData),
                            datasets: [{ label: "Audit Findings", data: Object.values(findData), backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6"], borderRadius: 6 }]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }
                const ctxRisk = document.getElementById("auditorRiskChart");
                if (ctxRisk && stats.auditor_risk_overview) {
                    const riskData = stats.auditor_risk_overview;
                    const riskLabels = Object.keys(riskData).map(k => `${k} (${riskData[k]})`);
                    activeRoleChartInstances.auditRisk = new Chart(ctxRisk, {
                        type: "doughnut",
                        data: {
                            labels: riskLabels,
                            datasets: [{ data: Object.values(riskData), backgroundColor: ["#ef4444", "#f59e0b", "#10b981"] }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, cutout: "65%" }
                    });
                }
            } else if (roleName === "Finance Officer") {
                const ctxCat = document.getElementById("finSpendCategoryChart");
                if (ctxCat && stats.fin_spend_category) {
                    const catData = stats.fin_spend_category;
                    activeRoleChartInstances.finCat = new Chart(ctxCat, {
                        type: "doughnut",
                        data: {
                            labels: Object.keys(catData),
                            datasets: [{ data: Object.values(catData), backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"] }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, cutout: "65%" }
                    });
                }
                const ctxTrend = document.getElementById("finSpendTrendChart");
                if (ctxTrend && stats.fin_spend_trend) {
                    const trend = stats.fin_spend_trend;
                    activeRoleChartInstances.finTrend = new Chart(ctxTrend, {
                        type: "line",
                        data: {
                            labels: trend.labels || ["Dec 24", "Jan 25", "Feb 25", "Mar 25", "Apr 25", "May 25"],
                            datasets: [{ label: "Spend (₹)", data: trend.spend || [], borderColor: "#3b82f6", tension: 0.3, fill: true, backgroundColor: "rgba(59,130,246,0.1)" }]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }
                const ctxBva = document.getElementById("finBudgetVsActualChart");
                if (ctxBva && stats.fin_budget_vs_actual) {
                    const bva = stats.fin_budget_vs_actual;
                    activeRoleChartInstances.finBva = new Chart(ctxBva, {
                        type: "bar",
                        data: {
                            labels: bva.categories || ["Raw Materials", "Equipment", "Services", "IT & Software", "Logistics"],
                            datasets: [
                                { label: "Budget (₹)", data: bva.budget || [], backgroundColor: "#3b82f6", borderRadius: 6 },
                                { label: "Actual (₹)", data: bva.actual || [], backgroundColor: "#10b981", borderRadius: 6 }
                            ]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }
            // Update Procurement Manager KPI Cards dynamically
            const pmPOEl = document.getElementById("pmPOCountVal");
            const pmPendingEl = document.getElementById("pmPendingApprovalVal");
            const pmSpendEl = document.getElementById("pmProcurementSpendVal");
            const pmVendorEl = document.getElementById("pmVendorPoolVal");
            const pmDeliveryEl = document.getElementById("pmDeliveryOnTimeVal");
            const pmReqEl = document.getElementById("pmRequisitionsVal");

            if (pmPOEl && stats.total_orders !== undefined) pmPOEl.innerText = stats.total_orders.toLocaleString();
            if (pmPendingEl && stats.pending_orders !== undefined) pmPendingEl.innerText = (stats.pending_orders + (stats.procurement_status_overview ? stats.procurement_status_overview.Pending : 0)).toLocaleString();
            if (pmSpendEl && stats.formatted_spend !== undefined) pmSpendEl.innerText = stats.formatted_spend;
            if (pmVendorEl && stats.total_vendors !== undefined) pmVendorEl.innerText = stats.total_vendors.toLocaleString();
            if (pmDeliveryEl && stats.on_time_delivery_pct !== undefined) pmDeliveryEl.innerText = `${stats.on_time_delivery_pct}%`;
            if (pmReqEl && stats.total_procurements !== undefined) pmReqEl.innerText = stats.total_procurements.toLocaleString();

            } else if (roleName === "Procurement Manager") {
                const ctxPoBar = document.getElementById("procurementBarChart");
                if (ctxPoBar && stats.po_status_volume) {
                    const poVol = stats.po_status_volume;
                    activeRoleChartInstances.procPoBar = new Chart(ctxPoBar, {
                        type: "bar",
                        data: {
                            labels: Object.keys(poVol),
                            datasets: [{
                                label: "Orders Count",
                                data: Object.values(poVol),
                                backgroundColor: ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444"],
                                borderRadius: 6
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }
                const ctxDeptPie = document.getElementById("procurementDeptPieChart");
                if (ctxDeptPie && stats.department_spend_distribution) {
                    const dSpend = stats.department_spend_distribution;
                    activeRoleChartInstances.procDeptPie = new Chart(ctxDeptPie, {
                        type: "doughnut",
                        data: {
                            labels: Object.keys(dSpend),
                            datasets: [{
                                data: Object.values(dSpend),
                                backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"]
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, cutout: "65%" }
                    });
                }
            } else if (roleName === "Supply Chain Manager") {
                const ctxMatrix = document.getElementById("scmRiskMatrixChart");
                if (ctxMatrix && stats.scm_risk_matrix) {
                    const matrixData = stats.scm_risk_matrix;
                    activeRoleChartInstances.scmMatrix = new Chart(ctxMatrix, {
                        type: "bar",
                        data: {
                            labels: Object.keys(matrixData),
                            datasets: [{ label: "Suppliers Count", data: Object.values(matrixData), backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"], borderRadius: 6 }]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }
                const ctxScmLine = document.getElementById("scmTrendLineChart");
                if (ctxScmLine && stats.scm_delivery_trend) {
                    const trend = stats.scm_delivery_trend;
                    activeRoleChartInstances.scmTrendLine = new Chart(ctxScmLine, {
                        type: "line",
                        data: {
                            labels: trend.labels || ["Week 1", "Week 2", "Week 3", "Week 4"],
                            datasets: [
                                { label: "On-Time Shipments (%)", data: trend.on_time || [], borderColor: "#10b981", tension: 0.3 },
                                { label: "Delayed Shipments (%)", data: trend.delayed || [], borderColor: "#ef4444", tension: 0.3 }
                            ]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }
            }
        })
        .catch(err => console.log("Dashboard stats error:", err));
}

document.addEventListener("DOMContentLoaded", function() {
    initRoleSession();
});
if (document.readyState === "complete" || document.readyState === "interactive") {
    initRoleSession();
}

window.addEventListener("focus", function() {
    const currentRole = localStorage.getItem("userRole") || "Administrator";
    if (typeof renderRoleDashboardCharts === "function") {
        renderRoleDashboardCharts(currentRole);
    }
});






