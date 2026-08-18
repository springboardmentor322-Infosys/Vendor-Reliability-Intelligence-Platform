const API_BASE_URL = "http://127.0.0.1:8000";

document.getElementById("vendorForm").addEventListener("submit", addVendor);

async function addVendor(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append("vendor_name", document.getElementById("vendor_name").value);
    formData.append("company", document.getElementById("company").value);
    formData.append("email", document.getElementById("email").value);
    formData.append("phone", document.getElementById("phone").value);
    formData.append("address", document.getElementById("address").value);
    formData.append("category", document.getElementById("category").value);

    try {
        const response = await fetch(`${API_BASE_URL}/vendors`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        
        if (response.ok) {
            showToast("Supplier registered successfully.", "success");
            // Delay redirect slightly so the user sees the success toast
            setTimeout(() => {
                window.location.href = "vendors.html";
            }, 1200);
        } else {
            showToast(result.detail || result.error || "Failed to register supplier.", "error");
        }
    } catch (error) {
        console.error("Register vendor error:", error);
        showToast("Error establishing connection with the server.", "error");
    }
}