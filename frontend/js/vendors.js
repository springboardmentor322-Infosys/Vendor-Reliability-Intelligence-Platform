// =======================================
// Vendor Management
// =======================================

let vendors = [];
let editingVendorId = null;

// =======================================
// Page Load
// =======================================

window.addEventListener("load", () => {

    loadVendors();

    initializeSearch();

    initializeStatusFilter();

});

// =======================================
// Load Vendors
// =======================================

async function loadVendors() {

    try {

        vendors = await apiRequest("/vendors");

        renderVendors(vendors);

    }

    catch (error) {

        console.error(error);

    }

}

// =======================================
// Render Vendors
// =======================================

function renderVendors(data) {

    const tbody = document.getElementById("vendorTableBody");

    tbody.innerHTML = "";

    if (data.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    No Vendors Found
                </td>
            </tr>
        `;

        return;

    }

    data.forEach((vendor) => {

        tbody.innerHTML += `
            <tr>

                <td>${vendor.id}</td>

                <td>${vendor.vendor_name}</td>

                <td>${vendor.category}</td>

                <td>${vendor.email}</td>

                <td>${vendor.phone}</td>

                <td>
                    <span class="status ${vendor.status.toLowerCase().replace(/\s+/g,"-")}">
                        ${vendor.status}
                    </span>
                </td>

                <td>
                    ${vendor.reliability_score}%
                </td>

                <td>

                    <button
                        class="edit-btn"
                        onclick="editVendor(${vendor.id})"
                    >
                        <i class="fa-solid fa-pen"></i>
                        Edit
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deleteVendor(${vendor.id})"
                    >
                        <i class="fa-solid fa-trash"></i>
                        Delete
                    </button>

                </td>

            </tr>
        `;

    });

}

// =======================================
// Delete Vendor
// =======================================

async function deleteVendor(id) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this vendor?"
    );

    if (!confirmDelete) {

        return;

    }

    try {

        await apiRequest(
            `/vendors/${id}`,
            "DELETE"
        );

        await loadVendors();

        alert("Vendor deleted successfully.");

    }

    catch (error) {

        console.error(error);

        alert("Unable to delete vendor.");

    }

}

// =======================================
// Edit Vendor
// =======================================

function editVendor(id) {

    const vendor = vendors.find(v => v.id === id);

    if (!vendor) return;

    editingVendorId = id;

    document.getElementById("vendorName").value = vendor.vendor_name;
    document.getElementById("category").value = vendor.category;
    document.getElementById("email").value = vendor.email;
    document.getElementById("phone").value = vendor.phone;
    document.getElementById("address").value = vendor.address;
    document.getElementById("reliability").value = vendor.reliability_score;
    document.getElementById("compliance").value = vendor.compliance_score;
    document.getElementById("status").value = vendor.status;

    document.querySelector("#vendorModal h2").innerText =
        "Edit Vendor";

    document.querySelector(
        "#vendorForm button[type='submit']"
    ).innerText =
        "Update Vendor";

    modal.classList.add("show");

}

// =======================================
// Search
// =======================================

function initializeSearch() {

    const search = document.getElementById("searchVendor");

    search.addEventListener("keyup", function () {

        const keyword = this.value.toLowerCase();

        const filtered = vendors.filter(v =>

            v.vendor_name.toLowerCase().includes(keyword) ||

            v.category.toLowerCase().includes(keyword) ||

            v.email.toLowerCase().includes(keyword)

        );

        renderVendors(filtered);

    });

}

// =======================================
// Status Filter
// =======================================

function initializeStatusFilter() {

    const filter = document.getElementById("statusFilter");

    filter.addEventListener("change", function () {

        const status = this.value;

        if (status === "") {

            renderVendors(vendors);

            return;

        }

        const filtered = vendors.filter(

            v => v.status === status

        );

        renderVendors(filtered);

    });

}

// =======================================
// Modal
// =======================================

const modal = document.getElementById("vendorModal");

document.getElementById("addVendorBtn").addEventListener("click", () => {

    editingVendorId = null;

    document.getElementById("vendorForm").reset();

    document.querySelector("#vendorModal h2").innerText =
        "Add Vendor";

    document.querySelector(
        "#vendorForm button[type='submit']"
    ).innerText =
        "Save Vendor";

    modal.classList.add("show");

});

document.getElementById("closeModal").addEventListener("click", () => {

    modal.classList.remove("show");

    editingVendorId = null;

    document.getElementById("vendorForm").reset();

    document.querySelector("#vendorModal h2").innerText =
        "Add Vendor";

    document.querySelector(
        "#vendorForm button[type='submit']"
    ).innerText =
        "Save Vendor";

});

// =======================================
// Save Vendor
// =======================================

document
    .getElementById("vendorForm")
    .addEventListener("submit", async function (e) {

        e.preventDefault();

        const vendor = {

            vendor_name: document.getElementById("vendorName").value,

            category: document.getElementById("category").value,

            email: document.getElementById("email").value,

            phone: document.getElementById("phone").value,

            address: document.getElementById("address").value,

            reliability_score: Number(
                document.getElementById("reliability").value
            ),

            compliance_score: Number(
                document.getElementById("compliance").value
            ),

            status: document.getElementById("status").value

        };

        try {

            if (editingVendorId === null) {

                await apiRequest(
                    "/vendors",
                    "POST",
                    vendor
                );

                alert("Vendor Added Successfully");

            }

            else {

                await apiRequest(
                    `/vendors/${editingVendorId}`,
                    "PUT",
                    vendor
                );

                alert("Vendor Updated Successfully");

            }

            modal.classList.remove("show");

            editingVendorId = null;

            document.getElementById("vendorForm").reset();

            document.querySelector("#vendorModal h2").innerText =
                "Add Vendor";

            document.querySelector(
                "#vendorForm button[type='submit']"
            ).innerText =
                "Save Vendor";

            await loadVendors();

        }

        catch (error) {

            console.error(error);

            alert("Unable to Save Vendor");

        }

    });