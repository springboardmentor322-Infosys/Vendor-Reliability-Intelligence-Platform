const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("contractForm").addEventListener("submit", addContract);
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("start_date").value = today;
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    document.getElementById("end_date").value = nextYear.toISOString().split('T')[0];
    
    loadVendors();
});

async function loadVendors() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendors`);
        const vendors = await response.json();

        if (Array.isArray(vendors)) {
            const vendorSelect = document.getElementById("vendor_id");
            if (vendorSelect) {
                vendorSelect.innerHTML = `<option value="">Select Vendor</option>`;
                vendors.forEach(vendor => {
                    vendorSelect.innerHTML += `<option value="${vendor.id}">${vendor.vendor_name}</option>`;
                });
            }
        }
    } catch (error) {
        console.error("Load vendors error:", error);
    }
}

async function addContract(event) {
    event.preventDefault();

    const payload = {
        vendor_id: parseInt(document.getElementById("vendor_id").value),
        contract_name: document.getElementById("contract_name").value,
        start_date: document.getElementById("start_date").value,
        end_date: document.getElementById("end_date").value,
        status: document.getElementById("status").value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/contracts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Contract created successfully.", "success");
            setTimeout(() => {
                window.location.href = "contracts.html";
            }, 1000);
        } else {
            showToast(result.detail || "Error saving contract.", "error");
        }
    } catch (error) {
        console.error("Add contract error:", error);
        showToast("Server connection error.", "error");
    }
}
