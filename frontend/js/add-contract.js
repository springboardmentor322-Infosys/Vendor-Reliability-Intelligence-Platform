const API_BASE_URL = "http://127.0.0.1:8000";

function getAuthHeaders(extraHeaders = {}) {
    const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
    const headers = { ...extraHeaders };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contractForm");
    if (form) {
        form.addEventListener("submit", addContract);
    }
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const startDateEl = document.getElementById("start_date");
    if (startDateEl) startDateEl.value = today;
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const endDateEl = document.getElementById("end_date");
    if (endDateEl) endDateEl.value = nextYear.toISOString().split('T')[0];
    
    loadVendors();
});

async function loadVendors() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendors`, {
            headers: getAuthHeaders()
        });
        const vendors = await response.json();

        if (Array.isArray(vendors)) {
            const vendorSelect = document.getElementById("vendor_id");
            if (vendorSelect) {
                vendorSelect.innerHTML = `<option value="">Select Vendor</option>`;
                vendors.forEach(vendor => {
                    vendorSelect.innerHTML += `<option value="${vendor.id}">#${vendor.id} - ${vendor.vendor_name}</option>`;
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
            headers: getAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.ok) {
            if (typeof showToast === "function") showToast("Contract created successfully.", "success");
            setTimeout(() => {
                window.location.href = "contracts.html";
            }, 1000);
        } else {
            if (typeof showToast === "function") showToast(result.detail || "Error saving contract.", "error");
        }
    } catch (error) {
        console.error("Add contract error:", error);
        if (typeof showToast === "function") showToast("Server connection error.", "error");
    }
}
