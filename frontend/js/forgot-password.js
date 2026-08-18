document.getElementById("forgotPasswordForm").addEventListener("submit", sendResetLink);

async function sendResetLink(event) {
    event.preventDefault();
    
    const email = document.getElementById("email").value;
    const messageDiv = document.getElementById("message");
    
    messageDiv.style.display = "block";
    messageDiv.className = "alert alert-info";
    messageDiv.innerText = "Processing request...";
    
    try {
        const formData = new FormData();
        formData.append("email", email);
        
        const response = await fetch(`/forgot-password`, {
            method: "POST",
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            messageDiv.className = "alert alert-success";
            messageDiv.innerText = result.message || "A password reset link has been logged.";
        } else {
            messageDiv.className = "alert alert-danger";
            messageDiv.innerText = result.detail || result.error || "Failed to process request.";
        }
    } catch (err) {
        console.error("Error during password reset request:", err);
        messageDiv.className = "alert alert-danger";
        messageDiv.innerText = "Network error. Please try again later.";
    }
}
