const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", loadUserProfile);
document.getElementById("profileForm").addEventListener("submit", updateUserProfile);

function showMessage(text, type = "info") {
    const messageDiv = document.getElementById("message");
    if (!messageDiv) return;
    
    messageDiv.style.display = "block";
    messageDiv.innerText = text;
    
    if (type === "success") {
        messageDiv.style.backgroundColor = "var(--success-bg)";
        messageDiv.style.color = "var(--success-text)";
    } else if (type === "error") {
        messageDiv.style.backgroundColor = "var(--danger-bg)";
        messageDiv.style.color = "var(--danger-text)";
    } else {
        messageDiv.style.backgroundColor = "var(--primary-light)";
        messageDiv.style.color = "var(--primary-color)";
    }
}

async function loadUserProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me`);
        
        if (!response.ok) {
            throw new Error(`Profile load failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        document.getElementById("name").value = data.name || "";
        document.getElementById("email").value = data.email || "";
        document.getElementById("role").value = data.role || "";
        document.getElementById("first_name").value = data.first_name || "";
        document.getElementById("last_name").value = data.last_name || "";
        document.getElementById("phone").value = data.phone || "";
    } catch (err) {
        console.error("Error loading user profile:", err);
        showMessage("Failed to load user profile.", "error");
    }
}

async function updateUserProfile(event) {
    event.preventDefault();
    
    const name = document.getElementById("name").value;
    const first_name = document.getElementById("first_name").value;
    const last_name = document.getElementById("last_name").value;
    const phone = document.getElementById("phone").value;
    
    showMessage("Updating profile...", "info");
    
    try {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("first_name", first_name);
        formData.append("last_name", last_name);
        formData.append("phone", phone);
        
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            method: "PUT",
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage(result.message || "Profile updated successfully!", "success");
            showToast("Profile details updated.", "success");
        } else {
            showMessage(result.detail || result.error || "Failed to update profile.", "error");
        }
    } catch (err) {
        console.error("Error updating profile:", err);
        showMessage("Network error. Please try again.", "error");
    }
}
